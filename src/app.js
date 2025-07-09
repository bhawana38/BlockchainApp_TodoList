App = {
  web3Provider: null,
  web3: null,
  loading : false,
  contracts: {},
  load: async () => {
    await App.loadWeb3();
    // You can load account, contracts, etc. here after connection
    await App.loadAccount();
    await App.loadContract();
    await App.render();
  },

  loadWeb3: async () => {
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      window.web3 = new Web3(window.ethereum);
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("MetaMask connected");
      } catch (error) {
        console.error("User denied account access", error);
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
      window.web3 = new Web3(window.web3.currentProvider);
      console.log("Legacy web3 provider detected");
    }
    // Non-dapp browsers...
    else {
      window.alert("Non-Ethereum browser detected. Please install MetaMask!");
    }
  },

  loadAccount: async () => {
  web3.eth.getAccounts(function(err, accounts) {
    if (err || accounts.length === 0) {
      alert("Unable to fetch accounts. Is MetaMask connected?");
      return;
    }
    App.account = accounts[0];
    console.log("Loaded account:", App.account);
    $('#account').html(App.account); // optional, to show the address in UI
  });
},

  loadContract: async () => {
    const todoList = await $.getJSON('TodoList.json')
    App.contracts.TodoList = TruffleContract(todoList);
    App.contracts.TodoList.setProvider(App.web3Provider);
    //hydrate the smart contract with values from the blockchain
    App.todoList = await App.contracts.TodoList.deployed();
  },

  render: async () => {
    //prevent double render
    if(App.loading){
      return;
    }
    //update app loading state
    App.setLoading(true);

    //render account
    $('#account').html(App.account);

    //render tasks
    await App.renderTasks();

    //update loading state 
    App.setLoading(false);
  },

  renderTasks: async () => {
    //load the task count from the blockchain
    const taskCount = await App.todoList.taskCount();
    const $taskTemplate = $('.taskTemplate');

    //render out each task with a new task template
    for(var i=1; i <=taskCount; i++){
      //fetch task data from the blockchain
      const task = await App.todoList.tasks(i);
      const taskId = task[0].toNumber();
      const taskContent = task[1];
      const taskCompleted = task[2];

      //create the html for the task
      const $newTaskTemplate = $taskTemplate.clone();
      $newTaskTemplate.find('.content').html(taskContent);
      $newTaskTemplate.find('input')
                      .prop('name',taskId)
                      .prop('checked',taskCompleted)
                       .on('click',App.toggleCompleted)
      if (taskCompleted) {
        $('#completedTaskList').append($newTaskTemplate)
      } else {
        $('#taskList').append($newTaskTemplate)
      }

      $newTaskTemplate.show();
    } 
  },

  createTask: async () => {
  App.setLoading(true);
  const content = $('#newTask').val();

  if (!App.account) {
    alert("No Ethereum account detected. Please connect MetaMask.");
    App.setLoading(false);
    return;
  }

  try {
    await App.todoList.createTask(content, { from: App.account });
    window.location.reload();
  } catch (err) {
    console.error("Failed to create task:", err);
    alert("Failed to create task. See console for details.");
    App.setLoading(false);
  }
  },
  toggleCompleted: async (e) => {
  App.setLoading(true);

  try {
    const taskId = e.target.name;

    if (!taskId || isNaN(taskId)) {
      throw new Error("Invalid task ID");
    }

    await App.todoList.toggleCompleted(taskId, { from: App.account });

    window.location.reload();
  } catch (error) {
    console.error("Error toggling task:", error.message || error);
    alert("Failed to toggle task. See console for details.");
  }

  App.setLoading(false);
},

   setLoading: (boolean) => {
    App.loading = boolean
    const loader = $('#loader')
    const content = $('#content')
    if (boolean) {
      loader.show()
      content.hide()
    } else {
      loader.hide()
      content.show()
    }
  }


};

// jQuery entry point
$(() => {
  $(window).on('load', () => {
    App.load();
  });
});
